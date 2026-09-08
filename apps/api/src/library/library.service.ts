import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateBookDto, IssueLoanDto, ReturnLoanDto, BookSearchDto } from './dto/library.dto';
import { LoanStatus } from '@prisma/client';

// Fine rate: ₦50 per overdue day
const FINE_PER_DAY = 50;

function calcFine(dueDate: Date, returnedAt: Date): number {
  const msOverdue = returnedAt.getTime() - dueDate.getTime();
  if (msOverdue <= 0) return 0;
  const daysOverdue = Math.ceil(msOverdue / (1000 * 60 * 60 * 24));
  return daysOverdue * FINE_PER_DAY;
}

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Books ─────────────────────────────────────────────────────────────────

  async addBook(dto: CreateBookDto, schoolId: string, actorId: string, actorEmail: string) {
    if (dto.isbn) {
      const existing = await this.prisma.book.findUnique({ where: { isbn: dto.isbn } });
      if (existing) throw new ConflictException(`A book with ISBN ${dto.isbn} already exists`);
    }

    const copies = dto.totalCopies ?? 1;
    const book = await this.prisma.book.create({
      data: { ...dto, schoolId, totalCopies: copies, availableCopies: copies },
    });

    await this.auditService.log({
      actorId, actorEmail, action: 'BOOK_ADDED',
      targetType: 'BOOK', targetId: book.id,
      afterValue: { title: dto.title, author: dto.author, copies } as Record<string, unknown>,
    });
    return book;
  }

  async searchBooks(schoolId: string, query: BookSearchDto) {
    const where: Record<string, unknown> = { schoolId, isActive: true };

    if (query.q) {
      where['OR'] = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { author: { contains: query.q, mode: 'insensitive' } },
        { isbn: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) where['category'] = query.category;
    if (query.availableOnly) where['availableCopies'] = { gt: 0 };

    return this.prisma.book.findMany({
      where,
      orderBy: [{ title: 'asc' }],
      include: { _count: { select: { loans: { where: { status: LoanStatus.ACTIVE } } } } },
    });
  }

  async getBook(id: string, schoolId: string) {
    const book = await this.prisma.book.findFirst({
      where: { id, schoolId },
      include: {
        loans: {
          where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async updateBook(id: string, schoolId: string, dto: Partial<CreateBookDto>, actorId: string, actorEmail: string) {
    const book = await this.prisma.book.findFirst({ where: { id, schoolId } });
    if (!book) throw new NotFoundException('Book not found');

    // If increasing total copies, increase available copies by same delta
    const data: Record<string, unknown> = { ...dto };
    if (dto.totalCopies && dto.totalCopies > book.totalCopies) {
      data['availableCopies'] = book.availableCopies + (dto.totalCopies - book.totalCopies);
    }

    const updated = await this.prisma.book.update({ where: { id }, data });
    await this.auditService.log({ actorId, actorEmail, action: 'BOOK_UPDATED', targetType: 'BOOK', targetId: id, afterValue: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deactivateBook(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const book = await this.prisma.book.findFirst({ where: { id, schoolId } });
    if (!book) throw new NotFoundException('Book not found');

    const activeLoans = await this.prisma.bookLoan.count({
      where: { bookId: id, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
    });
    if (activeLoans > 0) {
      throw new BadRequestException(`Cannot deactivate — ${activeLoans} copy(ies) still on loan`);
    }

    const updated = await this.prisma.book.update({ where: { id }, data: { isActive: false } });
    await this.auditService.log({ actorId, actorEmail, action: 'BOOK_DEACTIVATED', targetType: 'BOOK', targetId: id });
    return updated;
  }

  // ── Loans ─────────────────────────────────────────────────────────────────

  async issueBook(dto: IssueLoanDto, schoolId: string, actorId: string, actorEmail: string) {
    const book = await this.prisma.book.findFirst({ where: { id: dto.bookId, schoolId, isActive: true } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.availableCopies <= 0) {
      throw new BadRequestException(`No copies available — all ${book.totalCopies} copies are on loan`);
    }

    if (dto.studentId) {
      const student = await this.prisma.student.findFirst({ where: { id: dto.studentId, schoolId } });
      if (!student) throw new NotFoundException('Student not found');

      // Check student has no existing active loan for this same book
      const existingLoan = await this.prisma.bookLoan.findFirst({
        where: { bookId: dto.bookId, studentId: dto.studentId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      });
      if (existingLoan) throw new BadRequestException('This student already has an active loan for this book');
    }

    const [loan] = await this.prisma.$transaction([
      this.prisma.bookLoan.create({
        data: {
          schoolId,
          bookId: dto.bookId,
          studentId: dto.studentId,
          borrowerName: dto.borrowerName,
          dueDate: new Date(dto.dueDate),
          status: LoanStatus.ACTIVE,
          issuedById: actorId,
          notes: dto.notes,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      // Decrement available copies
      this.prisma.book.update({
        where: { id: dto.bookId },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);

    await this.auditService.log({
      actorId, actorEmail, action: 'BOOK_ISSUED',
      targetType: 'BOOK_LOAN', targetId: loan.id,
      afterValue: { bookId: dto.bookId, borrowerName: dto.borrowerName, dueDate: dto.dueDate } as Record<string, unknown>,
    });
    return loan;
  }

  async returnBook(loanId: string, dto: ReturnLoanDto, schoolId: string, actorId: string, actorEmail: string) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, schoolId },
      include: { book: { select: { id: true, title: true } } },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status === LoanStatus.RETURNED) {
      throw new BadRequestException('Book already returned');
    }

    const returnedAt = new Date();
    const fine = dto.waiveFine ? 0 : calcFine(loan.dueDate, returnedAt);

    const [updated] = await this.prisma.$transaction([
      this.prisma.bookLoan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.RETURNED,
          returnedAt,
          returnedById: actorId,
          fine,
          finePaid: fine === 0, // auto-mark paid if no fine
          notes: dto.notes ?? loan.notes,
        },
      }),
      // Increment available copies
      this.prisma.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    await this.auditService.log({
      actorId, actorEmail, action: 'BOOK_RETURNED',
      targetType: 'BOOK_LOAN', targetId: loanId,
      afterValue: { bookId: loan.bookId, fine, returnedAt: returnedAt.toISOString() } as Record<string, unknown>,
    });

    return { ...updated, fineAmount: fine };
  }

  // ── Mark overdue loans (called by a scheduled job or manually) ──────────

  async syncOverdueStatus(schoolId: string) {
    const now = new Date();
    const result = await this.prisma.bookLoan.updateMany({
      where: {
        schoolId,
        status: LoanStatus.ACTIVE,
        dueDate: { lt: now },
      },
      data: { status: LoanStatus.OVERDUE },
    });
    return { markedOverdue: result.count };
  }

  // ── List loans ─────────────────────────────────────────────────────────────

  async getActiveLoans(schoolId: string) {
    // First sync overdue status
    await this.syncOverdueStatus(schoolId);

    return this.prisma.bookLoan.findMany({
      where: { schoolId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      include: {
        book: { select: { id: true, title: true, author: true, shelfLocation: true } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueLoans(schoolId: string) {
    await this.syncOverdueStatus(schoolId);
    const now = new Date();

    return this.prisma.bookLoan.findMany({
      where: { schoolId, status: LoanStatus.OVERDUE },
      include: {
        book: { select: { id: true, title: true, author: true } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    }).then((loans) =>
      loans.map((loan) => ({
        ...loan,
        daysOverdue: Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        estimatedFine: calcFine(loan.dueDate, now),
      })),
    );
  }

  async getStudentLoanHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const loans = await this.prisma.bookLoan.findMany({
      where: { studentId, schoolId },
      include: { book: { select: { id: true, title: true, author: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalFines = loans.reduce((sum, l) => sum + l.fine, 0);
    const unpaidFines = loans.filter((l) => l.fine > 0 && !l.finePaid).reduce((sum, l) => sum + l.fine, 0);

    return { student, totalLoans: loans.length, totalFines, unpaidFines, loans };
  }

  async markFinePaid(loanId: string, schoolId: string, actorId: string, actorEmail: string) {
    const loan = await this.prisma.bookLoan.findFirst({ where: { id: loanId, schoolId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.fine <= 0) throw new BadRequestException('No fine on this loan');
    const updated = await this.prisma.bookLoan.update({ where: { id: loanId }, data: { finePaid: true } });
    await this.auditService.log({ actorId, actorEmail, action: 'FINE_PAID', targetType: 'BOOK_LOAN', targetId: loanId, afterValue: { fine: loan.fine } as Record<string, unknown> });
    return updated;
  }
}

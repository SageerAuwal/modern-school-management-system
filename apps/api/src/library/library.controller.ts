import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LibraryService } from './library.service';
import { CreateBookDto, IssueLoanDto, ReturnLoanDto, BookSearchDto, BuyBookDto } from './dto/library.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // ── Books ─────────────────────────────────────────────────────────────────

  /** POST /api/v1/library/books — add book to catalogue */
  @Post('books')
  @Roles(UserRole.ADMIN)
  addBook(@Body() dto: CreateBookDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.addBook(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/library/books?q=&category=&availableOnly= — search catalogue */
  @Get('books')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  searchBooks(@Query() query: BookSearchDto, @CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.searchBooks(actor.schoolId, query);
  }

  /** GET /api/v1/library/books/:id — book detail with active loans */
  @Get('books/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  getBook(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.getBook(id, actor.schoolId);
  }

  /** POST /api/v1/library/books/:id/buy — student/parent/admin purchase book */
  @Post('books/:id/buy')
  @Roles(UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT)
  buyBook(
    @Param('id') id: string,
    @Body() dto: BuyBookDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.libraryService.buyBook(id, dto, actor.schoolId, actor.id, actor.email);
  }

  /** PATCH /api/v1/library/books/:id — update book details or copy count */
  @Patch('books/:id')
  @Roles(UserRole.ADMIN)
  updateBook(@Param('id') id: string, @Body() dto: Partial<CreateBookDto>, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.updateBook(id, actor.schoolId, dto, actor.id, actor.email);
  }

  /** PATCH /api/v1/library/books/:id/deactivate — remove from active catalogue */
  @Patch('books/:id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivateBook(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.deactivateBook(id, actor.schoolId, actor.id, actor.email);
  }

  // ── Loans ─────────────────────────────────────────────────────────────────

  /** POST /api/v1/library/loans — issue book to student or staff */
  @Post('loans')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  issueBook(@Body() dto: IssueLoanDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.issueBook(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/library/loans/active — all currently borrowed books */
  @Get('loans/active')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  getActiveLoans(@CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.getActiveLoans(actor.schoolId);
  }

  /** GET /api/v1/library/loans/overdue — all overdue loans with estimated fines */
  @Get('loans/overdue')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  getOverdueLoans(@CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.getOverdueLoans(actor.schoolId);
  }

  /** GET /api/v1/library/loans/student/:studentId — student borrowing history */
  @Get('loans/student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  getStudentHistory(@Param('studentId') studentId: string, @CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.getStudentLoanHistory(studentId, actor.schoolId);
  }

  /** PATCH /api/v1/library/loans/:id/return — return book, compute fine */
  @Patch('loans/:id/return')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  returnBook(@Param('id') id: string, @Body() dto: ReturnLoanDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.returnBook(id, dto, actor.schoolId, actor.id, actor.email);
  }

  /** PATCH /api/v1/library/loans/:id/fine-paid — mark fine as collected */
  @Patch('loans/:id/fine-paid')
  @Roles(UserRole.ADMIN)
  markFinePaid(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.libraryService.markFinePaid(id, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/library/sync-overdue — manually trigger overdue sync */
  @Post('sync-overdue')
  @Roles(UserRole.ADMIN)
  syncOverdue(@CurrentUser() actor: { schoolId: string }) {
    return this.libraryService.syncOverdueStatus(actor.schoolId);
  }
}

import {
  IsString, IsNumber, IsOptional, IsInt, Min, MinLength,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  author: string;

  @IsString()
  @IsOptional()
  isbn?: string;

  @IsString()
  @IsOptional()
  category?: string; // "Science", "Fiction", "Mathematics", "Reference"

  @IsString()
  @IsOptional()
  publisher?: string;

  @IsInt()
  @IsOptional()
  @Min(1000)
  publishYear?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  totalCopies?: number;

  @IsString()
  @IsOptional()
  shelfLocation?: string; // "A3", "Row 2 Shelf 4"

  @IsString()
  @IsOptional()
  description?: string;
}

export class IssueLoanDto {
  @IsString()
  bookId: string;

  @IsString()
  @IsOptional()
  studentId?: string; // omit for staff borrows

  @IsString()
  borrowerName: string; // "Amina Bello" — snapshot name for display

  @IsString()
  dueDate: string; // ISO date string e.g. "2025-09-21"

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnLoanDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  waiveFine?: boolean; // Admin can waive the fine
}

export class BookSearchDto {
  @IsString()
  @IsOptional()
  q?: string; // title, author, or ISBN search

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsOptional()
  availableOnly?: boolean; // only show books with copies available
}

export class BuyBookDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  buyerName?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

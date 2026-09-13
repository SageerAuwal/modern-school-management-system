-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'NURSE', 'LIBRARIAN', 'TRANSPORT_COORDINATOR', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'TRANSFERRED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYSTACK', 'CASH', 'BANK_DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emis_id" TEXT,
    "exam_center_no" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "lga" TEXT,
    "ward" TEXT,
    "district" TEXT,
    "state" TEXT,
    "ownership_type" TEXT,
    "operating_status" TEXT,
    "levels_offered" TEXT[],
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "invite_token" TEXT,
    "invite_expiry" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "other_names" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "state_of_origin" TEXT,
    "lga" TEXT,
    "religion" TEXT,
    "admission_number" TEXT,
    "enrollment_status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "photo_url" TEXT,
    "blood_group" TEXT,
    "medical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_links" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relationship" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sections" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "stream" TEXT,
    "academic_year" TEXT NOT NULL,
    "capacity" INTEGER,
    "teacher_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exited_at" TIMESTAMP(3),
    "exit_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_records" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "gender" "Gender",
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "marked_by_id" TEXT NOT NULL,
    "edited_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "teacher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "ca1" DOUBLE PRECISION,
    "ca2" DOUBLE PRECISION,
    "ca3" DOUBLE PRECISION,
    "exam" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "grade" TEXT,
    "remark" TEXT,
    "entered_by_id" TEXT NOT NULL,
    "edited_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "term_id" TEXT,
    "academic_year" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "term_id" TEXT,
    "academic_year" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "fee_structure_id" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "paystack_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "recorded_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "category" TEXT,
    "publisher" TEXT,
    "publish_year" INTEGER,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "shelf_location" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "student_id" TEXT,
    "borrower_name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "fine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fine_paid" BOOLEAN NOT NULL DEFAULT false,
    "issued_by_id" TEXT NOT NULL,
    "returned_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "driver_name" TEXT NOT NULL,
    "driver_phone" TEXT,
    "assistant_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_routes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_name" TEXT NOT NULL,
    "stop_order" INTEGER NOT NULL,
    "landmark" TEXT,
    "pickup_time" TEXT,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_transport" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "pickup_stop" TEXT NOT NULL,
    "dropoff_stop" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_transport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_emis_id_key" ON "schools"("emis_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_token_key" ON "users"("invite_token");

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_admission_number_key" ON "students"("admission_number");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "students_enrollment_status_idx" ON "students"("enrollment_status");

-- CreateIndex
CREATE INDEX "students_admission_number_idx" ON "students"("admission_number");

-- CreateIndex
CREATE INDEX "guardian_links_guardian_id_idx" ON "guardian_links"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_links_student_id_guardian_id_key" ON "guardian_links"("student_id", "guardian_id");

-- CreateIndex
CREATE INDEX "class_sections_school_id_idx" ON "class_sections"("school_id");

-- CreateIndex
CREATE INDEX "class_sections_academic_year_idx" ON "class_sections"("academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "class_sections_school_id_name_academic_year_key" ON "class_sections"("school_id", "name", "academic_year");

-- CreateIndex
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");

-- CreateIndex
CREATE INDEX "enrollments_class_section_id_idx" ON "enrollments"("class_section_id");

-- CreateIndex
CREATE INDEX "enrollments_academic_year_idx" ON "enrollments"("academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_class_section_id_academic_year_key" ON "enrollments"("student_id", "class_section_id", "academic_year");

-- CreateIndex
CREATE INDEX "staff_records_school_id_idx" ON "staff_records"("school_id");

-- CreateIndex
CREATE INDEX "staff_records_is_active_idx" ON "staff_records"("is_active");

-- CreateIndex
CREATE INDEX "attendance_records_school_id_date_idx" ON "attendance_records"("school_id", "date");

-- CreateIndex
CREATE INDEX "attendance_records_class_section_id_date_idx" ON "attendance_records"("class_section_id", "date");

-- CreateIndex
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_student_id_class_section_id_date_key" ON "attendance_records"("student_id", "class_section_id", "date");

-- CreateIndex
CREATE INDEX "subjects_school_id_idx" ON "subjects"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_school_id_name_key" ON "subjects"("school_id", "name");

-- CreateIndex
CREATE INDEX "terms_school_id_idx" ON "terms"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "terms_school_id_name_academic_year_key" ON "terms"("school_id", "name", "academic_year");

-- CreateIndex
CREATE INDEX "class_subjects_class_section_id_idx" ON "class_subjects"("class_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_class_section_id_subject_id_key" ON "class_subjects"("class_section_id", "subject_id");

-- CreateIndex
CREATE INDEX "scores_student_id_term_id_idx" ON "scores"("student_id", "term_id");

-- CreateIndex
CREATE INDEX "scores_class_section_id_subject_id_term_id_idx" ON "scores"("class_section_id", "subject_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_student_id_subject_id_class_section_id_term_id_key" ON "scores"("student_id", "subject_id", "class_section_id", "term_id");

-- CreateIndex
CREATE INDEX "fee_structures_school_id_idx" ON "fee_structures"("school_id");

-- CreateIndex
CREATE INDEX "fee_structures_academic_year_idx" ON "fee_structures"("academic_year");

-- CreateIndex
CREATE INDEX "invoices_school_id_idx" ON "invoices"("school_id");

-- CreateIndex
CREATE INDEX "invoices_student_id_idx" ON "invoices"("student_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_school_id_idx" ON "payments"("school_id");

-- CreateIndex
CREATE INDEX "payments_reference_idx" ON "payments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_school_id_idx" ON "books"("school_id");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_isbn_idx" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "book_loans_school_id_idx" ON "book_loans"("school_id");

-- CreateIndex
CREATE INDEX "book_loans_book_id_idx" ON "book_loans"("book_id");

-- CreateIndex
CREATE INDEX "book_loans_student_id_idx" ON "book_loans"("student_id");

-- CreateIndex
CREATE INDEX "book_loans_status_idx" ON "book_loans"("status");

-- CreateIndex
CREATE INDEX "buses_school_id_idx" ON "buses"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "buses_school_id_plate_number_key" ON "buses"("school_id", "plate_number");

-- CreateIndex
CREATE INDEX "transport_routes_school_id_idx" ON "transport_routes"("school_id");

-- CreateIndex
CREATE INDEX "transport_routes_bus_id_idx" ON "transport_routes"("bus_id");

-- CreateIndex
CREATE INDEX "route_stops_route_id_idx" ON "route_stops"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_stop_order_key" ON "route_stops"("route_id", "stop_order");

-- CreateIndex
CREATE INDEX "student_transport_school_id_idx" ON "student_transport"("school_id");

-- CreateIndex
CREATE INDEX "student_transport_bus_id_idx" ON "student_transport"("bus_id");

-- CreateIndex
CREATE INDEX "student_transport_route_id_idx" ON "student_transport"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_transport_student_id_academic_year_key" ON "student_transport"("student_id", "academic_year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_records" ADD CONSTRAINT "staff_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_returned_by_id_fkey" FOREIGN KEY ("returned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

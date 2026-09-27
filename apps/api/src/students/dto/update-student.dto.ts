import { PartialType } from '../../common/utils/partial-type.helper';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

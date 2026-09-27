import { Type } from '@nestjs/common';

export function PartialType<T>(classRef: Type<T>): Type<Partial<T>> {
  abstract class PartialClassType {}
  Object.getOwnPropertyNames(classRef.prototype).forEach((key) => {
    if (key !== 'constructor') {
      const desc = Object.getOwnPropertyDescriptor(classRef.prototype, key);
      if (desc) Object.defineProperty(PartialClassType.prototype, key, desc);
    }
  });
  return PartialClassType as Type<Partial<T>>;
}

import { ICategory, CategoryModel } from '../category/category.interface';

/**
 * ServiceCategory is now unified with Category module.
 * Keeping this interface as an alias for backwards compatibility.
 */
export type IServiceCategory = ICategory;
export type ServiceCategoryModel = CategoryModel;
export { ICategory, CategoryModel };

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ITestimonial } from './testimonial.interface';
import { Testimonial } from './testimonial.model';
import unlinkFile from '../../../shared/unlinkFile';

const createTestimonialToDB = async (payload: ITestimonial) => {
  const result = await Testimonial.create(payload);
  return result;
};

const updateTestimonialFromDB = async (
  id: string,
  payload: Partial<ITestimonial>,
) => {
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Testimonial not found');
  }

  if (testimonial?.image && testimonial.image !== payload.image) {
    unlinkFile(testimonial.image);
  }

  const result = await Testimonial.findByIdAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

const deleteTestimonialToDB = async (id: string) => {
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Testimonial not found');
  }
  if (testimonial.image) {
    unlinkFile(testimonial.image);
  }

  const result = await Testimonial.deleteOne({ _id: id });
  return result;
};

const getAllTestimonialFromDB = async () => {
  const result = await Testimonial.find();
  return result;
};

const getSingleTestimonialFromDB = async (id: string) => {
  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Testimonial not found');
  }

  const result = await Testimonial.findById(id);
  return result;
};

export const TestimonialServices = {
  createTestimonialToDB,
  updateTestimonialFromDB,
  deleteTestimonialToDB,
  getAllTestimonialFromDB,
  getSingleTestimonialFromDB,
};

import { Request, Response } from 'express';
import { BlogServices } from './blog.service';
import { getSingleFilePath } from '../../../../shared/getFilePath';
import sendResponse from '../../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../../shared/catchAsync';

const parseBlogPayload = (data: any) => {
  const parsed = { ...data };

  // Parse tags if string (JSON array string or comma-separated)
  if (typeof parsed.tags === 'string') {
    try {
      const json = JSON.parse(parsed.tags);
      if (Array.isArray(json)) {
        parsed.tags = json;
      } else {
        parsed.tags = parsed.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
    } catch {
      parsed.tags = parsed.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }
  }

  // Parse isFeatured if string
  if (typeof parsed.isFeatured === 'string') {
    parsed.isFeatured = parsed.isFeatured === 'true';
  }

  return parsed;
};

const createBlog = catchAsync(async (req: Request, res: Response) => {
  let data = parseBlogPayload(req.body);

  // Automatically assign author from authenticated admin if not specified
  if (!data.author && req.user?.id) {
    data.author = req.user.id;
  }

  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }

  const result = await BlogServices.createBlogToDB(data);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Blog created successfully',
    data: result,
  });
});

const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.getAllBlogsFromDB(req.user, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blogs fetched successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const getSingleBlogFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.getSingleBlogFromDB(
    req.params.id,
    req.user,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog fetched successfully',
    data: result,
  });
});

const updateBlog = catchAsync(async (req: Request, res: Response) => {
  let data = parseBlogPayload(req.body);

  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }

  const result = await BlogServices.updateBlogToDB(req.params.id, data);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog updated successfully',
    data: result,
  });
});

const updateBlogStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.updateBlogStatusToDB(
    req.params.id,
    req.body.status,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog status updated successfully',
    data: result,
  });
});

const toggleBlogFeatured = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.toggleBlogFeaturedToDB(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog featured status toggled successfully',
    data: result,
  });
});

const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.deleteBlogFromDB(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog deleted successfully',
    data: result,
  });
});

const getBlogStats = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.blogStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Blog stats fetched successfully',
    data: result,
  });
});

export const BlogController = {
  createBlog,
  getAllBlogs,
  getSingleBlogFromDB,
  updateBlog,
  updateBlogStatus,
  toggleBlogFeatured,
  deleteBlog,
  getBlogStats,
};

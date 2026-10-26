import { z } from 'zod';

const createCommentZodSchema = z.object({
    body: z.object({
        text: z.string({
            required_error: "Comment text is required",
        }).trim().min(1, "Comment text must not be empty").max(1000, "Comment is too long"),
    })
})

const updateCommentZodSchema = z.object({
    body: z.object({
        text: z
            .string({
                required_error: 'Comment is required',
            })
            .trim()
            .min(1)
            .max(1000).optional()
    }),
});

export const CommentValidations = {
    createCommentZodSchema,
    updateCommentZodSchema
};

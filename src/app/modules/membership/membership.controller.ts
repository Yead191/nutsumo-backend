import { Request, Response, NextFunction } from 'express';
import { MembershipServices } from './membership.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createMembershipToDB = catchAsync(async (req: Request, res: Response) => {

    const result = await MembershipServices.createMembershipToDB(req.body)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Membership created successfully',
        data: result
    })

})

const getAllMembershipFromDB = catchAsync(async (req: Request, res: Response) => {

    const result = await MembershipServices.getAllMembershipFromDB(req.query)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Membership fetched successfully',
        data: result.membership,
        pagination: result.pagination
    })

})

const getMembershipByIdFromDB = catchAsync(async (req: Request, res: Response) => {

    const result = await MembershipServices.getMembershipByIdFromDB(req.params.id)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Membership fetched successfully',
        data: result
    })

})

const updateMembershipToDB = catchAsync(async (req: Request, res: Response) => {

    const result = await MembershipServices.updateMembershipToDB(req.params.id, req.body)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Membership updated successfully',
        data: result
    })

})

const deleteMembershipToDB = catchAsync(async (req: Request, res: Response) => {

    const result = await MembershipServices.deleteMembershipToDB(req.params.id)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Membership deleted successfully',
        data: result
    })

})

export const MembershipController = { createMembershipToDB, getAllMembershipFromDB, updateMembershipToDB, deleteMembershipToDB, getMembershipByIdFromDB };

import express from 'express';
import { MembershipController } from './membership.controller';
import { MembershipValidations } from './membership.validation';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.route('/')
    .get(MembershipController.getAllMembershipFromDB)
    .post(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        validateRequest(MembershipValidations.createMembershipZodSchema),
        MembershipController.createMembershipToDB
    );

router.route('/:id')
    .get(MembershipController.getMembershipByIdFromDB)
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        validateRequest(MembershipValidations.updateMembershipZodSchema),
        MembershipController.updateMembershipToDB
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        MembershipController.deleteMembershipToDB
    );

export const MembershipRoutes = router;

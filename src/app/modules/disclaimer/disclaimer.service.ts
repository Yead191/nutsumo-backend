import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IDisclaimer } from './disclaimer.interface';
import { Disclaimer } from './disclaimer.model';

const createDisclaimer = async (payload: IDisclaimer) => {
  const disclaimer = await Disclaimer.findOne({ type: payload.type });
  if (disclaimer) {
    await Disclaimer.findOneAndUpdate(
      { type: payload.type },
      { content: payload.content },
      { new: true },
    );
    return payload.content;
  }
  const createdDisclaimer = await Disclaimer.create(payload);
  return createdDisclaimer.content;
};

const getDisclaimer = async (type: string) => {
  // console.log(type, 'type');
  const disclaimer = await Disclaimer.findOne(
    { type: type },
    { content: 1 },
  ).lean();
  if (!disclaimer) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'No disclaimer found for this type',
    );
  }
  // console.log(disclaimer);
  return disclaimer.content;
};

export const DisclaimerServices = {
  createDisclaimer,
  getDisclaimer,
};

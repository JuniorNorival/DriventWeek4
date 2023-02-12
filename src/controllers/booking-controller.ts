import { AuthenticatedRequest } from '@/middlewares';
import bookingService from '@/services/booking-service';
import { Response } from 'express';
import httpStatus from 'http-status';

export async function getBookingByUser(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.body;

  try {
    const booking = await bookingService.getBookingByUser(userId);
    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    return res.status(httpStatus.NOT_FOUND).send(error.message);
  }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.body;
  const roomId = Number(req.body.roomId);

  try {
    const newBooking = bookingService.createBooking(userId, roomId);

    return res.status(httpStatus.OK).send(newBooking);
  } catch (error) {
    if (error.name === 'ForbidenError') {
      return res.status(httpStatus.FORBIDDEN).send(error.message);
    }

    if (error.name === 'NotFoundError') {
      return res.status(httpStatus.NOT_FOUND).send(error.message);
    }
  }
}

export async function putBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const bookingId = Number(req.params.bookingId);
  const roomId = Number(req.body.roomId);

  try {
    const updatedBooking = await bookingService.updateBooking(userId, bookingId, roomId);

    return res.status(httpStatus.OK).send(updatedBooking);
  } catch (error) {
    if (error.name === 'ForbiddenError') {
      return res.status(httpStatus.FORBIDDEN).send(error.message);
    }
    return res.status(httpStatus.NOT_FOUND).send(error.message);
  }
}

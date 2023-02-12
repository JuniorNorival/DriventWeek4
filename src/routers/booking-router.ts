import { Router } from 'express';
import { getBookingByUser, postBooking, putBooking } from '@/controllers';

import { authenticateToken } from '@/middlewares';

const bookingRouter = Router();

bookingRouter
  .all('/*', authenticateToken)
  .get('/', getBookingByUser)
  .post('/', postBooking)
  .put('/:bookingId', putBooking);

export { bookingRouter };

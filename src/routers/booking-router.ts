import { Router } from 'express';
import { getBookingByUser } from '@/controllers';

import { authenticateToken } from '@/middlewares';

const bookingRouter = Router();

bookingRouter.all('/*', authenticateToken).get('/', getBookingByUser);

export { bookingRouter };

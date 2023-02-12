import { notFoundError } from '@/errors';
import bookingRepository from '@/repositories/booking-repository';

async function getBookingByUser(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);

  if (!booking) throw notFoundError();

  return booking;
}

const bookingService = {
  getBookingByUser,
};

export default bookingService;

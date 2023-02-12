import { notFoundError, forbiddenError } from '@/errors';
import bookingRepository from '@/repositories/booking-repository';
import enrollmentRepository from '@/repositories/enrollment-repository';
import ticketRepository from '@/repositories/ticket-repository';
import { TicketStatus } from '@prisma/client';

async function getBookingByUser(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);

  if (!booking) throw notFoundError();

  return booking;
}

async function createBooking(userId: number, roomId: number) {
  await verifyRoom(roomId);
  await verifyTicket(userId);

  const userBooking = await bookingRepository.findBookingByUserId(userId);

  if (userBooking) throw forbiddenError();

  const newBookingData = { userId, roomId };

  const newBooking = await bookingRepository.createNewBooking(newBookingData);

  return newBooking;
}

async function updateBooking(userId: number, bookingId: number, roomId: number) {
  const booking = await bookingRepository.findBookingById(bookingId);

  if (!booking) {
    throw notFoundError();
  }

  if (userId !== booking.userId || roomId === booking.roomId) {
    throw forbiddenError();
  }

  await verifyRoom(roomId);

  const updatedBooking = await bookingRepository.updateBooking(bookingId, roomId);

  return updatedBooking;
}
async function verifyTicket(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollment) {
    throw forbiddenError();
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket) throw forbiddenError();

  if (ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw forbiddenError();
  }

  if (ticket.status !== TicketStatus.PAID) {
    throw forbiddenError();
  }

  return;
}

async function verifyRoom(roomId: number) {
  const room = await bookingRepository.findRoomById(roomId);

  if (!room) throw notFoundError();

  const bookingRoom = await bookingRepository.countBookingRoomId(roomId);

  if (bookingRoom >= room.capacity) throw forbiddenError();
  return;
}
const bookingService = {
  getBookingByUser,
  createBooking,
  updateBooking,
};

export default bookingService;

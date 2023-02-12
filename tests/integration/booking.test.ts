import app, { init } from '@/app';
import faker from '@faker-js/faker';
import { prisma } from '@/config';
import { TicketStatus } from '@prisma/client';
import httpStatus from 'http-status';
import * as jwt from 'jsonwebtoken';
import supertest from 'supertest';
import {
  createUser,
  createEnrollmentWithAddress,
  createTicket,
  createTicketTypeWithHotel,
  createHotel,
  createRoomWithHotelId,
  createBooking,
  createTicketType,
  createTicketTypeRemote,
} from '../factories';
import { cleanDb, generateValidToken } from '../helpers';

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe('GET /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.get('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();

    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  describe('when token is valid', () => {
    it('should respond with status 404 when there if user doesnt have a booking', async () => {
      const token = await generateValidToken();

      const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it('should respond with status 200 and booking data', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const booking = await createBooking(user.id, room.id);

      const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: booking.id,
        userId: booking.userId,
        roomId: booking.roomId,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        Room: {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          hotelId: room.hotelId,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        },
      });
    });
  });
});

describe('POST /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.get('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();

    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  describe('when token is valid', () => {
    describe('when user is not allowed to make a booking', () => {
      it('should respond with status 404 if body param roomId is missing', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        await createRoomWithHotelId(hotel.id);

        const body = {};

        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 404 if body param roomId is invalid', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        await createRoomWithHotelId(hotel.id);

        const body = { roomId: 0 };

        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 403 if user doesnt have an enrollment', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);

        const body = { roomId: room.id };

        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if user doesnt have an ticket', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };

        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if user have an ticket online', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };
        const ticketType = await createTicketTypeRemote();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if user have a presential ticket without hotel', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };
        const ticketType = await createTicketType();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if user have an unpaid ticket', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if user already has a booking', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createBooking(user.id, room.id);
        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if given roomId is at maximum capacity', async () => {
        const user = await createUser();
        const otherUser = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id };
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createBooking(user.id, room.id);
        await createBooking(otherUser.id, room.id);
        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 404 if roomId doenst exist', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const enrollment = await createEnrollmentWithAddress(user);
        const body = { roomId: room.id + 1 };
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });
      describe('when user can make a booking ', () => {
        it('should respond with status 200 and booking data', async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const hotel = await createHotel();
          const room = await createRoomWithHotelId(hotel.id);
          const enrollment = await createEnrollmentWithAddress(user);
          const body = { roomId: room.id };
          const ticketType = await createTicketTypeWithHotel();
          await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

          const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

          expect(response.status).toBe(httpStatus.OK);
          expect(response.body).toEqual({
            id: expect.any(Number),
            roomId: room.id,
            userId: user.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          });
        });
        it('should insert a new booking in the database', async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketType = await createTicketTypeWithHotel();
          await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
          const hotel = await createHotel();
          const room = await createRoomWithHotelId(hotel.id);

          const beforeCount = await prisma.booking.count();

          const body = { roomId: room.id };

          const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send(body);

          const afterCount = await prisma.booking.count();

          expect(response.status).toBe(httpStatus.OK);
          expect(beforeCount).toBe(0);
          expect(afterCount).toBe(1);
        });
      });
    });
  });
});
describe('PUT /booking/:bookingId', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.put('/booking/1');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.put('/booking/1').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put('/booking/1').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  describe('when token is valid', () => {
    describe('when user is not allowed to update a booking', () => {
      it('should respond with status 404 if bookingId param is invalid', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const newRoom = await createRoomWithHotelId(hotel.id);
        await createBooking(user.id, room.id);

        const body = { roomId: newRoom.id };

        const response = await server.put('/booking/0').set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 404 if body param roomId is missing', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = {};

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 404 if body param roomId is invalid', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: 0 };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 404 if given bookingId doesnt exist', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: room.id };

        const response = await server
          .put(`/booking/${booking.id + 1}`)
          .set('Authorization', `Bearer ${token}`)
          .send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });

      it('should respond with status 403 if user doesnt have a booking', async () => {
        const user = await createUser();
        const otherUser = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const room2 = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(otherUser.id, room.id);

        const body = { roomId: room2.id };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 403 if trying to update booking to same roomId', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: room.id };
        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });

      it('should respond with status 404 if trying to update booking to an roomId that doesnt exist', async () => {
        const user = await createUser();

        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const room2 = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: room2.id + 1 };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
      });
      it('should respond with status 403 if new roomId is at maximum capacity', async () => {
        const user = await createUser();
        const otherUser = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const newRoom = await createRoomWithHotelId(hotel.id);
        await createBooking(otherUser.id, newRoom.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: newRoom.id };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
    });
    describe('when user is allowed to update a booking', () => {
      it('should respond with status 200 and with new booking data', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const newRoom = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const body = { roomId: newRoom.id };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({
          id: expect.any(Number),
          roomId: newRoom.id,
          userId: user.id,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
      it('should update a booking in the database', async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const newRoom = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);

        const beforeUpdate = await prisma.booking.findFirst({ where: { id: booking.id } });

        const body = { roomId: newRoom.id };

        const response = await server.put(`/booking/${booking.id}`).set('Authorization', `Bearer ${token}`).send(body);

        const afterUpdate = await prisma.booking.findFirst({ where: { id: booking.id } });

        expect(response.status).toBe(httpStatus.OK);
        expect(beforeUpdate).toEqual({
          id: booking.id,
          roomId: room.id,
          userId: user.id,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
        expect(afterUpdate).toEqual({
          id: booking.id,
          roomId: newRoom.id,
          userId: user.id,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      });
    });
  });
});

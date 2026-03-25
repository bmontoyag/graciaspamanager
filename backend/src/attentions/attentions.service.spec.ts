import { Test, TestingModule } from '@nestjs/testing';
import { AttentionsService } from './attentions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AttentionsService', () => {
  let service: AttentionsService;
  let prisma: any;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    service: {
      findUnique: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    attention: {
      create: jest.fn(),
    },
    client: {
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    payment: {
      updateMany: jest.fn(),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttentionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttentionsService>(AttentionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a COMPLETED appointment and link it when appointmentId is missing', async () => {
      const dto = {
        clientId: 1,
        serviceId: 2,
        workerIds: [3],
        totalCost: 100,
        date: new Date().toISOString(),
      };

      prisma.user.findMany.mockResolvedValue([{ id: 3, commissionPercentage: 50 }]);
      prisma.service.findUnique.mockResolvedValue({ id: 2, durationMin: 45 });
      prisma.appointment.create.mockResolvedValue({ id: 99 });
      prisma.attention.create.mockResolvedValue({ id: 500, appointmentId: 99 });

      const result = await service.create(dto);

      // Verify appointment creation
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            serviceId: 2,
            duration: 45, // Fallback to service duration
          }),
        })
      );

      // Verify attention creation with the new appointmentId
      expect(prisma.attention.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appointmentId: 99,
          }),
        })
      );

      expect(result.id).toBe(500);
    });

    it('should use provided duration and workers when auto-creating appointment', async () => {
      const dto = {
        clientId: 1,
        serviceId: 2,
        workerIds: [3, 4],
        totalCost: 100,
        duration: 75,
      };

      prisma.user.findMany.mockResolvedValue([
        { id: 3, commissionPercentage: 50 },
        { id: 4, commissionPercentage: 40 }
      ]);
      prisma.appointment.create.mockResolvedValue({ id: 101 });
      prisma.attention.create.mockResolvedValue({ id: 600, appointmentId: 101 });

      await service.create(dto);

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 75,
            workers: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ workerId: 3 }),
                expect.objectContaining({ workerId: 4 }),
              ]),
            }),
          }),
        })
      );
    });
  });

  describe('createBatch', () => {
    it('should create multiple COMPLETED appointments if appointmentId is missing in batch', async () => {
      const batchDto = {
        clientId: 1,
        services: [
          { serviceId: 10, workerIds: [1], totalCost: 50 },
          { serviceId: 11, workerIds: [2], totalCost: 60, duration: 90 },
        ],
      };

      prisma.user.findMany.mockResolvedValue([
        { id: 1, commissionPercentage: 50 },
        { id: 2, commissionPercentage: 50 }
      ]);
      prisma.service.findUnique.mockResolvedValue({ id: 10, durationMin: 30 });
      prisma.appointment.create
        .mockResolvedValueOnce({ id: 201 })
        .mockResolvedValueOnce({ id: 202 });
      prisma.attention.create
        .mockResolvedValueOnce({ id: 801, appointmentId: 201 })
        .mockResolvedValueOnce({ id: 802, appointmentId: 202 });

      await service.createBatch(batchDto);

      // Should call appointment.create twice
      expect(prisma.appointment.create).toHaveBeenCalledTimes(2);
      
      // First appointment (default duration)
      expect(prisma.appointment.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
        data: expect.objectContaining({ serviceId: 10, duration: 30 })
      }));

      // Second appointment (provided duration)
      expect(prisma.appointment.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
        data: expect.objectContaining({ serviceId: 11, duration: 90 })
      }));
    });
  });
});

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create users
  const users = await prisma.user.createMany({
    data: [
      { id: 'u1', name: 'John Doe', avatar: 'JD' },
      { id: 'u2', name: 'Alice Johnson', avatar: 'AJ' },
      { id: 'u3', name: 'Bob Smith', avatar: 'BS' },
      { id: 'u4', name: 'Charlie Davis', avatar: 'CD' },
      { id: 'u5', name: 'Diana Wilson', avatar: 'DW' },
    ],
    skipDuplicates: true,
  });
  console.log(`Created ${users.count} users`);

  // Create chats
  const chats = await prisma.chat.createMany({
    data: [
      { id: 'c1' }, // John <-> Alice
      { id: 'c2' }, // John <-> Bob
      { id: 'c3' }, // John <-> Charlie
      { id: 'c4' }, // Alice <-> Diana (John NOT participant)
      { id: 'c5', name: 'Team Chat' }, // Group: John, Alice, Bob
      { id: 'c6' }, // Group: John, Alice, Bob
    ],
    skipDuplicates: true,
  });
  console.log(`Created ${chats.count} chats`);

  // Create chat participants
  const participants = await prisma.chatParticipant.createMany({
    data: [
      // c1: John <-> Alice
      { chatId: 'c1', userId: 'u1' },
      { chatId: 'c1', userId: 'u2' },
      // c2: John <-> Bob
      { chatId: 'c2', userId: 'u1' },
      { chatId: 'c2', userId: 'u3' },
      // c3: John <-> Charlie
      { chatId: 'c3', userId: 'u1' },
      { chatId: 'c3', userId: 'u4' },
      // c4: Alice <-> Diana
      { chatId: 'c4', userId: 'u2' },
      { chatId: 'c4', userId: 'u5' },
      // c5: Team Chat (John, Alice, Bob)
      { chatId: 'c5', userId: 'u1' },
      { chatId: 'c5', userId: 'u2' },
      { chatId: 'c5', userId: 'u3' },
      // c6: Group (John, Alice, Bob)
      { chatId: 'c6', userId: 'u1' },
      { chatId: 'c6', userId: 'u2' },
      { chatId: 'c6', userId: 'u3' },
    ],
    skipDuplicates: true,
  });
  console.log(`Created ${participants.count} chat participants`);

  // Create messages
  const messages = await prisma.message.createMany({
    data: [
      // Chat c1 messages (John <-> Alice)
      {
        id: 'm1',
        chatId: 'c1',
        content: 'Hey! How are you doing?',
        senderId: 'u2',
        timestamp: new Date('2025-12-01T09:00:00Z'),
      },
      {
        id: 'm2',
        chatId: 'c1',
        content: "I'm doing great! Just finished the project proposal.",
        senderId: 'u1',
        timestamp: new Date('2025-12-01T09:05:00Z'),
      },
      {
        id: 'm3',
        chatId: 'c1',
        content: "That's awesome! Can you send it over?",
        senderId: 'u2',
        timestamp: new Date('2025-12-01T09:10:00Z'),
      },
      {
        id: 'm4',
        chatId: 'c1',
        content: "Sure, I'll email it to you in a few minutes.",
        senderId: 'u1',
        timestamp: new Date('2025-12-01T09:15:00Z'),
      },

      // Chat c2 messages (John <-> Bob)
      {
        id: 'm5',
        chatId: 'c2',
        content: 'Meeting at 3 PM today?',
        senderId: 'u3',
        timestamp: new Date('2025-12-01T08:30:00Z'),
      },
      {
        id: 'm6',
        chatId: 'c2',
        content: "Yes, I'll be there!",
        senderId: 'u1',
        timestamp: new Date('2025-12-01T08:35:00Z'),
      },
      {
        id: 'm7',
        chatId: 'c2',
        content: 'Great! See you in the conference room.',
        senderId: 'u3',
        timestamp: new Date('2025-12-01T08:40:00Z'),
      },

      // Chat c3 messages (John <-> Charlie)
      {
        id: 'm8',
        chatId: 'c3',
        content: 'Thanks for your help yesterday!',
        senderId: 'u4',
        timestamp: new Date('2025-11-30T16:20:00Z'),
      },
      {
        id: 'm9',
        chatId: 'c3',
        content: 'No problem at all! Happy to help.',
        senderId: 'u1',
        timestamp: new Date('2025-11-30T16:25:00Z'),
      },

      // Chat c4 messages (Alice <-> Diana) - John is NOT a participant
      {
        id: 'm10',
        chatId: 'c4',
        content: 'Did you see the game last night?',
        senderId: 'u5',
        timestamp: new Date('2025-11-30T22:00:00Z'),
      },
      {
        id: 'm11',
        chatId: 'c4',
        content: 'Yes! What an incredible finish!',
        senderId: 'u2',
        timestamp: new Date('2025-11-30T22:05:00Z'),
      },
      {
        id: 'm12',
        chatId: 'c4',
        content: 'I know right! That last-minute goal was amazing.',
        senderId: 'u5',
        timestamp: new Date('2025-11-30T22:08:00Z'),
      },

      // Chat c5 messages (Group chat: John, Alice, Bob)
      {
        id: 'm13',
        chatId: 'c5',
        content: 'Team lunch on Friday?',
        senderId: 'u1',
        timestamp: new Date('2025-11-29T14:00:00Z'),
      },
      {
        id: 'm14',
        chatId: 'c5',
        content: "I'm in! Where are we going?",
        senderId: 'u2',
        timestamp: new Date('2025-11-29T14:05:00Z'),
      },
      {
        id: 'm15',
        chatId: 'c5',
        content: 'How about the new Italian place downtown?',
        senderId: 'u3',
        timestamp: new Date('2025-11-29T14:10:00Z'),
      },
    ],
    skipDuplicates: true,
  });
  console.log(`Created ${messages.count} messages`);

  // Create message views (to set up unread counts)
  const messageViews = await prisma.messageView.createMany({
    data: [
      // u1 has viewed all messages in c1
      { userId: 'u1', messageId: 'm1', viewedAt: new Date('2025-12-01T09:01:00Z') },
      { userId: 'u1', messageId: 'm2', viewedAt: new Date('2025-12-01T09:06:00Z') },
      { userId: 'u1', messageId: 'm3', viewedAt: new Date('2025-12-01T09:11:00Z') },
      { userId: 'u1', messageId: 'm4', viewedAt: new Date('2025-12-01T09:16:00Z') },
      // u1 has only viewed first message in c2 (2 unread: m6, m7)
      { userId: 'u1', messageId: 'm5', viewedAt: new Date('2025-12-01T08:31:00Z') },
      // u1 has viewed all messages in c3
      { userId: 'u1', messageId: 'm8', viewedAt: new Date('2025-11-30T16:21:00Z') },
      { userId: 'u1', messageId: 'm9', viewedAt: new Date('2025-11-30T16:26:00Z') },
    ],
    skipDuplicates: true,
  });
  console.log(`Created ${messageViews.count} message views`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

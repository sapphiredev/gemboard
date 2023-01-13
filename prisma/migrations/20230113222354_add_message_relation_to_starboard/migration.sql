/*
  Warnings:

  - The primary key for the `StarboardBoardMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `messageId` to the `StarboardBoardMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_messageId_fkey";

-- DropForeignKey
ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_userId_fkey";

-- AlterTable
ALTER TABLE "StarboardBoardMessage" DROP CONSTRAINT "StarboardBoardMessage_pkey",
ADD COLUMN     "messageId" BIGINT NOT NULL,
ADD CONSTRAINT "StarboardBoardMessage_pkey" PRIMARY KEY ("snowflake", "channelId", "guildId", "messageId");

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarboardBoardMessage" ADD CONSTRAINT "StarboardBoardMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

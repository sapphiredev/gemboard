/*
  Warnings:

  - The primary key for the `StarboardBoardMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `authorId` to the `StarboardBoardMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StarboardBoardMessage" DROP CONSTRAINT "StarboardBoardMessage_pkey",
ADD COLUMN     "authorId" BIGINT NOT NULL,
ADD CONSTRAINT "StarboardBoardMessage_pkey" PRIMARY KEY ("snowflake", "authorId", "channelId", "guildId", "messageId");

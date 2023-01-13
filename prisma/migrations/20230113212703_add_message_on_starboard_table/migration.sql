-- DropIndex
DROP INDEX "Message_snowflake_key";

-- DropIndex
DROP INDEX "User_snowflake_key";

-- CreateTable
CREATE TABLE "StarboardBoardMessage" (
    "snowflake" BIGINT NOT NULL,
    "channelId" BIGINT NOT NULL,
    "guildId" BIGINT NOT NULL,

    CONSTRAINT "StarboardBoardMessage_pkey" PRIMARY KEY ("snowflake","channelId","guildId")
);

-- CreateTable
CREATE TABLE "Message" (
    "snowflake" BIGINT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "User" (
    "snowflake" BIGINT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "UserMessage" (
    "userId" BIGINT NOT NULL,
    "messageId" BIGINT NOT NULL,

    CONSTRAINT "UserMessage_pkey" PRIMARY KEY ("userId","messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_snowflake_key" ON "Message"("snowflake");

-- CreateIndex
CREATE UNIQUE INDEX "User_snowflake_key" ON "User"("snowflake");

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;

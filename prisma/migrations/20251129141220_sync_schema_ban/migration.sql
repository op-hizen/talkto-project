-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Ban_userId_idx" ON "Ban"("userId");

-- CreateIndex
CREATE INDEX "Ban_bannedById_idx" ON "Ban"("bannedById");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_accessStatus_idx" ON "User"("accessStatus");

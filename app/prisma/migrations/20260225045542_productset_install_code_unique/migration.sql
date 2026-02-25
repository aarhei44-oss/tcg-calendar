/*
  Warnings:

  - A unique constraint covering the columns `[tcgProfileInstallId,code]` on the table `ProductSet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductSet_tcgProfileInstallId_code_key" ON "ProductSet"("tcgProfileInstallId", "code");

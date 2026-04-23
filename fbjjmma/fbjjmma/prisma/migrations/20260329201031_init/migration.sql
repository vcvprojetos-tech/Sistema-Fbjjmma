-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRESIDENTE', 'COORDENADOR_GERAL', 'COORDENADOR_TATAME', 'ATLETA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "Belt" AS ENUM ('BRANCA', 'AMARELA_LARANJA_VERDE', 'AZUL', 'ROXA', 'MARROM', 'PRETA');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('PRE_MIRIM', 'MIRIM', 'INFANTIL_A', 'INFANTIL_B', 'INFANTO_JUVENIL_A', 'INFANTO_JUVENIL_B', 'JUVENIL', 'ADULTO', 'MASTER_1', 'MASTER_2', 'MASTER_3', 'MASTER_4', 'MASTER_5', 'MASTER_6');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('RASCUNHO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDENTE', 'APROVADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARTAO', 'DINHEIRO');

-- CreateEnum
CREATE TYPE "BracketStatus" AS ENUM ('PENDENTE', 'DESIGNADA', 'EM_ANDAMENTO', 'FINALIZADA', 'PREMIADA');

-- CreateEnum
CREATE TYPE "WOType" AS ENUM ('PESO', 'AUSENCIA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ATLETA',
    "customRoleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photo" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" "Sex" NOT NULL,
    "belt" "Belt" NOT NULL DEFAULT 'BRANCA',
    "weight" DOUBLE PRECISION NOT NULL,
    "teamId" TEXT,
    "professor" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "isAffiliated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_team_history" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "athlete_team_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_categories" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "sex" "Sex" NOT NULL,
    "name" TEXT NOT NULL,
    "maxWeight" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "weight_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "correctionDeadline" TIMESTAMP(3) NOT NULL,
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "checkinRelease" TIMESTAMP(3) NOT NULL,
    "bracketRelease" TIMESTAMP(3) NOT NULL,
    "weightTableId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "absoluteValue" DOUBLE PRECISION,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "banner" TEXT,
    "schedule" TEXT,
    "about" TEXT,
    "paymentInfo" TEXT,
    "prize" TEXT,
    "weighInInfo" TEXT,
    "imageRights" TEXT,
    "physicalIntegrity" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'RASCUNHO',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_category_values" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "absoluteValue" DOUBLE PRECISION,

    CONSTRAINT "event_category_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT,
    "professor" TEXT,
    "sex" "Sex" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "belt" "Belt" NOT NULL,
    "weightCategoryId" TEXT NOT NULL,
    "isAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDENTE',
    "paymentMethod" "PaymentMethod",
    "paymentProof" TEXT,
    "observation" TEXT,
    "medal" TEXT,
    "teamPoints" BOOLEAN NOT NULL DEFAULT true,
    "awarded" BOOLEAN NOT NULL DEFAULT false,
    "affiliated" BOOLEAN NOT NULL DEFAULT false,
    "pointDiff" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tatames" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tatames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_coordinators" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tatame_operations" (
    "id" TEXT NOT NULL,
    "tatameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "tatame_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brackets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tatameId" TEXT,
    "weightCategoryId" TEXT NOT NULL,
    "isAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "bracketNumber" INTEGER NOT NULL,
    "status" "BracketStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_positions" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "registrationId" TEXT,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bracket_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "position1Id" TEXT,
    "position2Id" TEXT,
    "winnerId" TEXT,
    "isWO" BOOLEAN NOT NULL DEFAULT false,
    "woType" "WOType",
    "woWeight1" DOUBLE PRECISION,
    "woWeight2" DOUBLE PRECISION,
    "callTimes" JSONB,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_name_key" ON "custom_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_userId_key" ON "athletes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "weight_tables_name_key" ON "weight_tables"("name");

-- CreateIndex
CREATE UNIQUE INDEX "weight_categories_tableId_ageGroup_sex_name_key" ON "weight_categories"("tableId", "ageGroup", "sex", "name");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_name_key" ON "event_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_category_values_eventId_sex_ageGroup_key" ON "event_category_values"("eventId", "sex", "ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_eventId_athleteId_isAbsolute_key" ON "registrations"("eventId", "athleteId", "isAbsolute");

-- CreateIndex
CREATE UNIQUE INDEX "tatames_eventId_name_key" ON "tatames"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "event_coordinators_eventId_userId_key" ON "event_coordinators"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "brackets_eventId_weightCategoryId_isAbsolute_key" ON "brackets"("eventId", "weightCategoryId", "isAbsolute");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_positions_bracketId_position_key" ON "bracket_positions"("bracketId", "position");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_team_history" ADD CONSTRAINT "athlete_team_history_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_team_history" ADD CONSTRAINT "athlete_team_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_categories" ADD CONSTRAINT "weight_categories_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "weight_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_weightTableId_fkey" FOREIGN KEY ("weightTableId") REFERENCES "weight_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_category_values" ADD CONSTRAINT "event_category_values_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_weightCategoryId_fkey" FOREIGN KEY ("weightCategoryId") REFERENCES "weight_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatames" ADD CONSTRAINT "tatames_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatame_operations" ADD CONSTRAINT "tatame_operations_tatameId_fkey" FOREIGN KEY ("tatameId") REFERENCES "tatames"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatame_operations" ADD CONSTRAINT "tatame_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tatameId_fkey" FOREIGN KEY ("tatameId") REFERENCES "tatames"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_weightCategoryId_fkey" FOREIGN KEY ("weightCategoryId") REFERENCES "weight_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_positions" ADD CONSTRAINT "bracket_positions_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "brackets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_positions" ADD CONSTRAINT "bracket_positions_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "brackets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_position1Id_fkey" FOREIGN KEY ("position1Id") REFERENCES "bracket_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_position2Id_fkey" FOREIGN KEY ("position2Id") REFERENCES "bracket_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "bracket_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

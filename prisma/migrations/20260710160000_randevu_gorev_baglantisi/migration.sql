-- Randevu hatırlatmasını randevuya bağla: randevu silinince görev de gider,
-- ertelenince görevin tarihi güncellenir.
ALTER TABLE "Task" ADD COLUMN "appointmentId" TEXT;
CREATE INDEX "Task_appointmentId_idx" ON "Task"("appointmentId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

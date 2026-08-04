import { Module } from '@nestjs/common'
import { SpController } from './sp.controller'
import { SpService } from './sp.service'

@Module({
  controllers: [SpController],
  providers: [SpService],
})
export class SpModule {}

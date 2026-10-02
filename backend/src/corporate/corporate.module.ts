import { Module } from '@nestjs/common';
import { CorporateController } from './corporate.controller';
import { CorporateQuotesService } from './corporate-quotes.service';
import { CorporateEventsService } from './corporate-events.service';

@Module({
    controllers: [CorporateController],
    providers: [CorporateQuotesService, CorporateEventsService],
})
export class CorporateModule { }

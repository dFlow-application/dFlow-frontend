import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StreamingRoutingModule } from './streaming-routing.module';
import { RoomListComponent } from './room-list/room-list.component';
import { RoomViewComponent } from './room-view/room-view.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [RoomListComponent, RoomViewComponent],
  imports: [
    SharedModule,
    StreamingRoutingModule
  ]
})
export class StreamingModule { }

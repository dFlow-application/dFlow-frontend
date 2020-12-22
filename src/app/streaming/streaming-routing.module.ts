import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RoomListComponent } from './room-list/room-list.component';
import { RoomViewComponent } from './room-view/room-view.component';

const routes: Routes = [
  {
    path: 'rooms',
    component: RoomListComponent
  },
  {
    path: 'rooms/:id',
    component: RoomViewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StreamingRoutingModule { }

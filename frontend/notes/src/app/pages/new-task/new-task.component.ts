import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Task } from 'src/app/model.ts/task.model';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss']
})
export class NewTaskComponent implements OnInit {

  listID: string;

  constructor(private taskService:TaskService, private route:ActivatedRoute, private router:Router) { }



  ngOnInit() {
    this.route.params.subscribe((param) => {
      console.log(param);
      this.listID = param['listId'];
      console.log(this.listID);
    });
  }

  createNewTask(taskTitle:string){
    this.taskService.createTask(taskTitle, this.listID).subscribe((response: Task) => {
      console.log(response);
      this.router.navigate(['../'], {relativeTo: this.route});
    });
  }
}

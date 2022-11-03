import { ThrowStmt } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { List } from 'src/app/model.ts/list.model';
import { Task } from 'src/app/model.ts/task.model';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-taskview',
  templateUrl: './taskview.component.html',
  styleUrls: ['./taskview.component.scss']
})
export class TaskviewComponent implements OnInit {
  lists:List[];
  tasks:Task[];

  constructor(private taskService: TaskService, private route:ActivatedRoute) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      console.log(params);
      if(params.listId){
        this.taskService.getTasks(params.listId).subscribe((tasks: Task[]) => {
        this.tasks = tasks;
        });
      } else{
        this.tasks = undefined;
      }
    });


  this.taskService.getAllList().subscribe((lists: List[]) => {
    this.lists = lists
  })
  }

  onTaskClick(task: Task) {
    //we want to set the task to completed
    this.taskService.complete(task).subscribe(() => {
      console.log("completed")
      task.completed = !task.completed;
    })
  }





}

import { Injectable } from '@angular/core';
import { Task } from './model.ts/task.model';
import { WebserviceService } from './webservice.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private webService: WebserviceService) { }

  createList(title:string) {
   return this.webService.post('lists', {title})
  }

  getAllList(){
    return this.webService.get('lists')
  }

  getTasks(listId:string){
    return this.webService.get(`lists/${listId}/tasks`)
  }

  createTask(taskTitle:string, listID:string){
    return this.webService.post(`lists/${listID}/tasks`, {taskTitle})
  }

  complete(task: Task) {
    return this.webService.put(`lists/${task._listId}/tasks/${task._id}`, {completed:!task.completed});
  }

}

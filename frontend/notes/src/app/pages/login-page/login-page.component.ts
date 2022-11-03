import { Component, OnInit } from '@angular/core';
import { AuthServiceService } from 'src/app/auth-service.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {

  constructor(private auth: AuthServiceService) { }

  ngOnInit(): void {
  }

  onLoginButtonClicked(email: string, password: string) {
    this.auth.logIn(email, password).subscribe((res) => {
      console.log(res);
    });
  }
}

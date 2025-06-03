import { Component, OnInit } from "@angular/core";
import { routes } from "../../consts";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { AuthService } from "../login/auth.service";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatIconModule, 
    MatListModule
  ]
})
export class SidebarComponent implements OnInit {
  public routes: typeof routes = routes;
  public isAdmin: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.authService.authState$.subscribe(authState => {
      this.isAdmin = authState.role === 'Admin';
    });
  }
}

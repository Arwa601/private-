import { Component, Input, Output, EventEmitter, type OnChanges, type SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import type { QAPipelinePermission } from "../../models/qa-user.model";

@Component({
  selector: "app-permissions-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./permissions-modal.component.html",
  styleUrls: ["./permissions-modal.component.css"],
})
export class PermissionsModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() pipelineName = "";
  @Input() userId = "";
  @Input() pipelineId: number | null = null;
  @Input() permissions: QAPipelinePermission | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<QAPipelinePermission>();

  editedPermissions: QAPipelinePermission = {
    CanViewHistory: false,
    CanTrigger: false,
    CanViewResults: false,
    CanDownloadReport: false,
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes["permissions"] && this.permissions) {
      this.editedPermissions = { ...this.permissions };
    }
  }

  closeModal() {
    this.close.emit();
  }

  onSave() {
    this.save.emit(this.editedPermissions);
  }
}

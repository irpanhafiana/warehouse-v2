import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { AppUpdateService } from '../../../core/services/app-update.service';

@Component({
  selector: 'app-update-dialog',
  templateUrl: './update-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateDialogComponent {
  protected readonly updateService = inject(AppUpdateService);

  readonly updateData = this.updateService.updateData;
  readonly isForce = this.updateService.isForceUpdate;
  readonly currentVersion = this.updateService.localVersionName;

  // Download states
  readonly isDownloading = this.updateService.isDownloading;
  readonly progress = this.updateService.downloadProgress;
  readonly error = this.updateService.downloadError;

  readonly newVersion = computed(() => {
    return this.updateData()?.versionName ?? 'Terbaru';
  });

  onDownload(): void {
    this.updateService.startDownloadAndInstall();
  }

  onDismiss(): void {
    if (!this.isDownloading()) {
      this.updateService.dismissUpdate();
    }
  }
}

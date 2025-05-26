import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Overlay, OverlayContainer } from '@angular/cdk/overlay';
import { MatSelect } from '@angular/material/select';

@Injectable({
  providedIn: 'root'
})
export class DropdownFixService implements OnDestroy {
  private resizeListener: any;
    constructor(
    private overlay: Overlay,
    private overlayContainer: OverlayContainer,
    private zone: NgZone
  ) {
    // Apply fixes when service is initialized
    this.applyDropdownFixes();
    
    // Listen for window resize to recalculate positions
    this.zone.runOutsideAngular(() => {
      this.resizeListener = () => this.recalculatePositions();
      window.addEventListener('resize', this.resizeListener);
    });
  }
  
  ngOnDestroy(): void {
    // Clean up event listener
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Applies global fixes to dropdown positioning
   */
  applyDropdownFixes(): void {
    // Set a custom scroll strategy for dropdowns
    this.zone.runOutsideAngular(() => {
      // Apply CSS class to the overlay container for styling
      const containerElement = this.overlayContainer.getContainerElement();
      containerElement.classList.add('dropdown-fixed-container');
      
      console.log('[DropdownFixService] Applied global dropdown fixes');
    });
  }
  /**
   * Forces overlay components to recalculate their positions
   * Use this if dropdown menus are appearing in wrong locations
   */
  recalculatePositions(): void {
    // Trigger recalculation
    this.zone.runOutsideAngular(() => {
      // This would force existing open dropdowns to update positions
      document.dispatchEvent(new Event('scroll'));
      
      // Fix any open overlay panels
      setTimeout(() => {
        // Handle select panels
        const openPanels = document.querySelectorAll('.mat-mdc-select-panel');
        if (openPanels.length > 0) {
          console.log('[DropdownFixService] Recalculating positions for open dropdowns');
          openPanels.forEach(panel => {
            const panelEl = panel as HTMLElement;
            panelEl.style.transform = 'none';
            panelEl.style.position = 'relative';
          });
        }
        
        // Handle overlay panes (the container of the dropdown)
        const overlayPanes = document.querySelectorAll('.cdk-overlay-pane');
        overlayPanes.forEach(pane => {
          const el = pane as HTMLElement;
          el.style.transform = 'none';
          el.style.position = 'absolute';
          el.style.top = 'auto';
          el.style.left = 'auto';
        });
        
        // Handle bounding boxes (positioning containers)
        const boundingBoxes = document.querySelectorAll('.cdk-overlay-connected-position-bounding-box');
        boundingBoxes.forEach(box => {
          const el = box as HTMLElement;
          el.style.transform = 'none';
          el.style.position = 'absolute';
          el.style.top = 'auto';
          el.style.left = 'auto';
        });
      }, 0);
    });
  }
  /**
   * Gets default configuration for dropdown select panels
   */
  getSelectPanelConfig() {
    return {
      panelClass: 'custom-select-panel',
      disableOptionCentering: true,
      backdropClass: 'cdk-overlay-transparent-backdrop'
    };
  }
  /**
   * Fixes select dropdown position on open
   * @param select The MatSelect component to fix
   */
  fixSelectOnOpen(select: MatSelect): void {
    if (!select) return;
    
    select.openedChange.subscribe(opened => {
      if (opened) {
        // When select dropdown opens, apply position fix
        this.zone.runOutsideAngular(() => {
          // First immediate fix
          this.applyDropdownPositionFixes();
          
          // Then follow up with a delayed fix to ensure proper positioning
          setTimeout(() => {
            this.applyDropdownPositionFixes();
          }, 10);
        });
      }
    });
  }
  
  /**
   * Apply position fixes to all dropdown elements currently in the DOM
   * This targets the specific elements that cause positioning issues
   */
  private applyDropdownPositionFixes(): void {
    // Fix panels (the actual dropdown content)
    const panels = document.querySelectorAll('.mat-mdc-select-panel');
    panels.forEach(panel => {
      const panelEl = panel as HTMLElement;
      if (panelEl) {
        // Remove transforms that cause positioning issues
        panelEl.style.transform = 'none';
        panelEl.style.position = 'relative';
        
        // Add positioning classes
        panelEl.classList.add('dropdown-fixed');
        panelEl.classList.add('azure-pipeline-dropdown');
      }
    });
    
    // Fix overlay panes (containers)
    const overlayPanes = document.querySelectorAll('.cdk-overlay-pane');
    overlayPanes.forEach(pane => {
      const el = pane as HTMLElement;
      el.style.transform = 'none';
      el.style.position = 'absolute';
      el.style.top = 'auto';
      el.style.left = 'auto';
      el.classList.add('position-fix');
    });
    
    // Fix bounding boxes (positioning context)
    const boundingBoxes = document.querySelectorAll('.cdk-overlay-connected-position-bounding-box');
    boundingBoxes.forEach(box => {
      const el = box as HTMLElement;
      el.style.transform = 'none';
      el.style.position = 'absolute';
    });
  }
  
  /**
   * Apply position fix to all Material select elements in the view
   */
  fixAllSelectsInView(): void {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        // Find all select elements that might need fixing
        const selects = document.querySelectorAll('.mat-mdc-select');
        console.log(`[DropdownFixService] Found ${selects.length} selects to fix`);
        
        // Apply position fixing classes
        selects.forEach(select => {
          select.classList.add('dropdown-fixed');
        });
      }, 0);
    });
  }
}
// home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Particle {
  left: string;
  top: string;
  delay: string;
  duration: string;
}

interface Stat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  particles: Particle[] = [];

  stats: Stat[] = [
    { value: '50+', label: 'Systems' },
    { value: '99%', label: 'Accuracy' },
    { value: '2min', label: 'Scan Time' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.generateParticles();
  }

  generateParticles(): void {
    this.particles = Array.from({ length: 30 }, () => ({
      left:     `${Math.random() * 100}%`,
      top:      `${Math.random() * 100}%`,
      delay:    `${(Math.random() * 6).toFixed(2)}s`,
      duration: `${(3 + Math.random() * 5).toFixed(2)}s`,
    }));
  }

  onStart(): void {
    // Navigate to the diagnostic page — adjust route as needed
    // this.router.navigate(['/diagnostic']);
    console.log('Starting AI Car Diagnostic...');
  }

  onImageError(event: Event): void {
    // Fallback: hide broken image and show placeholder
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.3';
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InRyYW5zcGFyZW50Ii8+PHBhdGggZD0iTTIwIDcwIEw0MCA0MCBMMTU1IDQwIEwxODAgNzAgWiIgc3Ryb2tlPSIjMkU4QkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9InJnYmEoNDYsMTM5LDI1NSwwLjA1KSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNzIiIHI9IjEyIiBzdHJva2U9IiMyRThCRkYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0icmdiYSg0NiwxMzksMjU1LDAuMSkiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSI3MiIgcj0iMTIiIHN0cm9rZT0iIzJFOEJGRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJyZ2JhKDQ2LDEzOSwyNTUsMC4xKSIvPjxyZWN0IHg9IjYwIiB5PSI0NSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiByeD0iNCIgc3Ryb2tlPSIjMkU4QkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0icmdiYSg0NiwxMzksMjU1LDAuMDUpIi8+PC9zdmc+';
  }
}

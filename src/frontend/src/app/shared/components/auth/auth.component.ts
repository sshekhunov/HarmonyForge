import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from '../../services/auth-state.service';
import { RegisterRequest, LoginRequest } from '../../models/auth.model';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        DialogModule,
        MessageModule
    ],
    template: `
        <p-dialog 
            [(visible)]="visible" 
            [modal]="true" 
            [style]="{ width: '450px' }"
            [draggable]="false"
            [resizable]="false"
            [header]="isLoginMode() ? 'Вход' : 'Регистрация'"
            (onHide)="onClose()">
            <div class="flex flex-col gap-4">
                <div class="flex gap-2 mb-4">
                    <button 
                        type="button"
                        class="flex-1 p-2 text-center rounded-lg transition-colors"
                        [class.bg-primary]="isLoginMode()"
                        [class.text-primary-50]="isLoginMode()"
                        [class.bg-surface-100]="!isLoginMode()"
                        [class.dark:bg-surface-800]="!isLoginMode()"
                        [class.text-surface-900]="!isLoginMode()"
                        [class.dark:text-surface-0]="!isLoginMode()"
                        (click)="setLoginMode(true)">
                        Вход
                    </button>
                    <button 
                        type="button"
                        class="flex-1 p-2 text-center rounded-lg transition-colors"
                        [class.bg-primary]="!isLoginMode()"
                        [class.text-primary-50]="!isLoginMode()"
                        [class.bg-surface-100]="isLoginMode()"
                        [class.dark:bg-surface-800]="isLoginMode()"
                        [class.text-surface-900]="isLoginMode()"
                        [class.dark:text-surface-0]="isLoginMode()"
                        (click)="setLoginMode(false)">
                        Регистрация
                    </button>
                </div>

                <form *ngIf="isLoginMode()" (ngSubmit)="onLogin()" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="login-email" class="text-surface-900 dark:text-surface-0 font-medium">Email</label>
                        <input 
                            pInputText 
                            id="login-email" 
                            type="email" 
                            placeholder="Email" 
                            [(ngModel)]="loginForm.email"
                            name="loginEmail"
                            required
                            class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="login-password" class="text-surface-900 dark:text-surface-0 font-medium">Пароль</label>
                        <p-password 
                            id="login-password" 
                            [(ngModel)]="loginForm.password" 
                            placeholder="Пароль" 
                            [toggleMask]="true"
                            [feedback]="false"
                            name="loginPassword"
                            [styleClass]="'w-full'"
                            [fluid]="true"
                            required></p-password>
                    </div>
                    <p-message *ngIf="loginError" severity="error" [text]="loginError"></p-message>
                    <p-button 
                        type="submit" 
                        label="Войти" 
                        [loading]="isLoading()"
                        [styleClass]="'w-full'"
                        styleClass="w-full"></p-button>
                </form>

                <form *ngIf="!isLoginMode()" (ngSubmit)="onRegister()" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="register-username" class="text-surface-900 dark:text-surface-0 font-medium">Имя пользователя</label>
                        <input 
                            pInputText 
                            id="register-username" 
                            type="text" 
                            placeholder="Имя пользователя" 
                            [(ngModel)]="registerForm.userName"
                            name="registerUsername"
                            required
                            class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="register-email" class="text-surface-900 dark:text-surface-0 font-medium">Email</label>
                        <input 
                            pInputText 
                            id="register-email" 
                            type="email" 
                            placeholder="Email" 
                            [(ngModel)]="registerForm.email"
                            name="registerEmail"
                            required
                            class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="register-password" class="text-surface-900 dark:text-surface-0 font-medium">Пароль</label>
                        <p-password 
                            id="register-password" 
                            [(ngModel)]="registerForm.password" 
                            placeholder="Пароль" 
                            [toggleMask]="true"
                            [feedback]="true"
                            name="registerPassword"
                            [styleClass]="'w-full'"
                            [fluid]="true"
                            required></p-password>
                    </div>
                    <p-message *ngIf="registerError" severity="error" [text]="registerError"></p-message>
                    <p-message *ngIf="registerSuccess" severity="success" [text]="'Регистрация успешна! Теперь вы можете войти.'"></p-message>
                    <p-button 
                        type="submit" 
                        label="Зарегистрироваться" 
                        [loading]="isLoading()"
                        [styleClass]="'w-full'"
                        styleClass="w-full"></p-button>
                </form>
            </div>
        </p-dialog>
    `
})
export class AuthComponent {
    visible = signal(false);
    isLoading = signal(false);
    loginMode = signal(true);
    loginError = '';
    registerError = '';
    registerSuccess = false;

    loginForm: LoginRequest = {
        email: '',
        password: ''
    };

    registerForm: RegisterRequest = {
        email: '',
        password: '',
        userName: ''
    };

    constructor(
        private authService: AuthService,
        private authStateService: AuthStateService
    ) {}

    show(): void {
        this.visible.set(true);
        this.resetForms();
    }

    hide(): void {
        this.visible.set(false);
    }

    onClose(): void {
        this.resetForms();
    }

    isLoginMode(): boolean {
        return this.loginMode();
    }

    setLoginMode(isLogin: boolean): void {
        this.loginMode.set(isLogin);
        this.resetForms();
    }

    resetForms(): void {
        this.loginForm = { email: '', password: '' };
        this.registerForm = { email: '', password: '', userName: '' };
        this.loginError = '';
        this.registerError = '';
        this.registerSuccess = false;
    }

    onLogin(): void {
        if (!this.loginForm.email || !this.loginForm.password) {
            this.loginError = 'Пожалуйста, заполните все поля';
            return;
        }

        this.isLoading.set(true);
        this.loginError = '';

        this.authService.login(this.loginForm).subscribe({
            next: (response) => {
                this.authService.saveToken(response.token);
                this.authStateService.setUser(response);
                this.isLoading.set(false);
                this.hide();
            },
            error: (error) => {
                this.isLoading.set(false);
                if (error.error?.message) {
                    this.loginError = error.error.message;
                } else {
                    this.loginError = 'Ошибка входа. Проверьте правильность данных.';
                }
            }
        });
    }

    onRegister(): void {
        if (!this.registerForm.email || !this.registerForm.password || !this.registerForm.userName) {
            this.registerError = 'Пожалуйста, заполните все поля';
            return;
        }

        this.isLoading.set(true);
        this.registerError = '';
        this.registerSuccess = false;

        this.authService.register(this.registerForm).subscribe({
            next: (response) => {
                this.authService.saveToken(response.token);
                this.authStateService.setUser(response);
                this.isLoading.set(false);
                this.registerSuccess = true;
                setTimeout(() => {
                    this.hide();
                }, 1500);
            },
            error: (error) => {
                this.isLoading.set(false);
                if (error.error?.message) {
                    this.registerError = error.error.message;
                } else {
                    this.registerError = 'Ошибка регистрации. Пользователь может уже существовать.';
                }
            }
        });
    }
}


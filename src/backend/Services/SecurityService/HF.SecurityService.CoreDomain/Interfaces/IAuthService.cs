using HF.SecurityService.CoreDomain.DTO;

namespace HF.SecurityService.CoreDomain.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request);
}


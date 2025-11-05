using HF.SecurityService.CoreDomain.DTO;

namespace HF.SecurityService.CoreDomain.Interfaces;

public interface IAuthService
{
    Task<RegisterResultDto> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request);
    List<string> GetPasswordRequirements();
}


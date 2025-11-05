namespace HF.SecurityService.CoreDomain.DTO;

public class RegisterResultDto
{
    public bool IsSuccess { get; set; }
    public AuthResponseDto? AuthResponse { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string>? PasswordRequirements { get; set; }
}


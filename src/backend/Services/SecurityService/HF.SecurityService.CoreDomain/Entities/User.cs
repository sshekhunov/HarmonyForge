using Microsoft.AspNetCore.Identity;

namespace HF.SecurityService.CoreDomain.Entities;

public class User : IdentityUser<Guid>
{
    public DateTime CreatedAt { get; set; }
}
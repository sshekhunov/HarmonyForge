using HF.StudentProfileService.Core.Domain.Entities;

namespace HF.StudentProfileService.Core.Domain.Interfaces.Repositories;

public interface IStudentRepository : IRepository<Student>
{
    Task<Student?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}


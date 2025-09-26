using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Repositories;

public interface ILearningCourseService
{
    Task<IList<LearningCourse>> GetAllAsync();

    Task<LearningCourse?> GetByIdAsync(Guid id);

    Task AddAsync(LearningCourse entity);

    Task UpdateAsync(LearningCourse entity);

    Task DeleteAsync(Guid id);
}
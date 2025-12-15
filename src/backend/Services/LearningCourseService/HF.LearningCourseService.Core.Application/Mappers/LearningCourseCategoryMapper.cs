using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningCourseCategoryMapper
{
    public static LearningCourseCategoryDto ToDto(LearningCourseCategory entity)
    {
        return new LearningCourseCategoryDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description
        };
    }

    public static IList<LearningCourseCategoryDto> ToDtoList(IEnumerable<LearningCourseCategory> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningCourseCategory ToEntity(CreateLearningCourseCategoryDto dto)
    {
        return new LearningCourseCategory
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description
        };
    }
}


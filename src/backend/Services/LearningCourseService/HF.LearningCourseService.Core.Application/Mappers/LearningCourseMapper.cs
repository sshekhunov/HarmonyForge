using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningCourseMapper
{
    public static LearningCourseDto ToDto(LearningCourse entity)
    {
        return new LearningCourseDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Title = entity.Title,
            Description = entity.Description,
            CategoryId = entity.CategoryId,
            Modules = entity.Modules.Select(LearningModuleMapper.ToDto).ToList()
        };
    }

    public static IList<LearningCourseDto> ToDtoList(IEnumerable<LearningCourse> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningCourse ToEntity(CreateCourseDto dto)
    {
        var course = new LearningCourse
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Title = dto.Title,
            Description = dto.Description,
            CategoryId = dto.CategoryId
        };
        
        course.AddModules(dto.Modules.Select(LearningModuleMapper.ToEntity).ToList());
        return course;
    }
}
using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningModuleMapper
{
    public static LearningModuleDto ToDto(LearningModule entity)
    {
        return new LearningModuleDto
        {
            Id = entity.Id,
            Title = entity.Title,
            Description = entity.Description
        };
    }

    public static IList<LearningModuleDto> ToDtoList(IEnumerable<LearningModule> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningModule ToEntity(LearningModuleDto dto)
    {
        return new LearningModule
        {
            Id = dto.Id,
            Title = dto.Title,
            Description = dto.Description
        };
    }

    public static IList<LearningModule> ToEntityList(IEnumerable<LearningModuleDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

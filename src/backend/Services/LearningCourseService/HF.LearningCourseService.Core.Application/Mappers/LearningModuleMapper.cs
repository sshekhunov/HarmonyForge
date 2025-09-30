using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningModuleMapper
{
    public static LearningModuleDto ToDto(LearningModule entity)
    {
        return new LearningModuleDto
        {
            Title = entity.Title,
            Description = entity.Description,
            Items = entity.Items.Select(LearningModuleItemMapper.ToDto).ToList()
        };
    }

    public static IList<LearningModuleDto> ToDtoList(IEnumerable<LearningModule> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningModule ToEntity(LearningModuleDto dto)
    {
        var module = new LearningModule
        {
            Title = dto.Title,
            Description = dto.Description
        };

        module.AddModuleItems(dto.Items.Select(LearningModuleItemMapper.ToEntity).ToList());
        return module;
    }

    public static IList<LearningModule> ToEntityList(IEnumerable<LearningModuleDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

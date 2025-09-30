using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Application.Mappers;

public static class LearningArticleMapper
{
    public static LearningArticleDto ToDto(LearningArticle entity)
    {
        return new LearningArticleDto
        {
            Id = entity.Id,
            LearningModuleId = entity.LearningModuleId,
            ContentItems = entity.ContentItems.Select(LearningArticleContentItemMapper.ToDto).ToList()
        };
    }

    public static IList<LearningArticleDto> ToDtoList(IEnumerable<LearningArticle> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningArticle ToEntity(CreateLearningArticleDto dto)
    {
        var article = new LearningArticle
        {
            Id = Guid.NewGuid(),
            LearningModuleId = dto.LearningModuleId
        };
        
        article.AddContentItems(dto.ContentItems.Select(LearningArticleContentItemMapper.ToEntity).ToList());
        return article;
    }
}

public static class LearningArticleContentItemMapper
{
    public static LearningArticleContentItemDto ToDto(LearningArticleContentItem entity)
    {
        return new LearningArticleContentItemDto
        {
            Content = entity.Content,
            SectionBlockNumber = entity.SectionBlockNumber
        };
    }

    public static IList<LearningArticleContentItemDto> ToDtoList(IEnumerable<LearningArticleContentItem> entities)
    {
        return entities.Select(ToDto).ToList();
    }

    public static LearningArticleContentItem ToEntity(LearningArticleContentItemDto dto)
    {
        return new LearningArticleContentItem
        {
            Content = dto.Content,
            SectionBlockNumber = dto.SectionBlockNumber
        };
    }

    public static IList<LearningArticleContentItem> ToEntityList(IEnumerable<LearningArticleContentItemDto> dtos)
    {
        return dtos.Select(ToEntity).ToList();
    }
}

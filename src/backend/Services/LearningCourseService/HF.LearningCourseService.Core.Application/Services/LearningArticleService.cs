using HF.LearningCourseService.Core.Application.Mappers;
using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;

namespace HF.LearningCourseService.Core.Application.Services;

public class LearningArticleService : ILearningArticleService
{
    private readonly ILearningArticleRepository _repository;

    public LearningArticleService(ILearningArticleRepository repository)
    {
        _repository = repository;
    }

    public async Task<IList<LearningArticleDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(cancellationToken);
        return LearningArticleMapper.ToDtoList(entities);
    }

    public async Task<LearningArticleDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity != null ? LearningArticleMapper.ToDto(entity) : null;
    }

    public async Task<IList<LearningArticleDto>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetByModuleIdAsync(moduleId, cancellationToken);
        return LearningArticleMapper.ToDtoList(entities);
    }

    public async Task<Guid> AddAsync(CreateLearningArticleDto request, CancellationToken cancellationToken = default)
    {
        var article = LearningArticleMapper.ToEntity(request);
        await _repository.AddAsync(article, cancellationToken);
        return article.Id;
    }

    public async Task UpdateAsync(UpdateLearningArticleDto request, CancellationToken cancellationToken = default)
    {
        var article = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (article is null)
        {
            throw new InvalidOperationException($"Learning article with ID {request.Id} not found");
        }       
        
        article.LearningModuleId = request.LearningModuleId;
        article.Title = request.Title;
        article.Description = request.Description;
        article.Number = request.Number;
        article.ClearContentSections();
        article.AddContentSections(request.ContentSections.Select(LearningArticleContentSectionMapper.ToEntity).ToList());

        await _repository.UpdateAsync(article, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteAsync(id, cancellationToken);
    }
}
